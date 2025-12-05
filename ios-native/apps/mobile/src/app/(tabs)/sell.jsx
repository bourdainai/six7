import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { Camera, Upload, X, Sparkles, Check } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { useAuth } from "@/utils/auth/useAuth";
import { supabase } from "@/utils/supabaseClient";
import { analyzeImages, uploadListingImages, createListingImages, createListing } from "@/utils/listings";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
};

export default function Sell() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState("upload");
  const [images, setImages] = useState([]);
  const [imageAssets, setImageAssets] = useState([]); // Store actual file assets
  const [detectedCard, setDetectedCard] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("like_new"); // Use DB enum values
  const [description, setDescription] = useState("");
  const [setName, setSetName] = useState("");
  const [rarity, setRarity] = useState("");
  const [isGraded, setIsGraded] = useState(false);
  const [acceptOffers, setAcceptOffers] = useState(true);
  const [shippingCost, setShippingCost] = useState("");
  const [freeShipping, setFreeShipping] = useState(true);
  const [aiAgentVisible, setAiAgentVisible] = useState(true);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const pickImage = async (useCamera = false) => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to list an item");
      return;
    }

    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to continue");
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.8,
        });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...newUris]);
      setImageAssets((prev) => [...prev, ...result.assets]);

      // Start AI detection if this is the first image
      if (images.length === 0) {
        setStep("detecting");
        
        try {
          // Call AI analysis Edge Function
          const analysis = await analyzeImages(newUris);
          
          if (analysis) {
            setAiAnalysis(analysis);
            
            // Map condition from AI to our enum
            const conditionMap = {
              "new_with_tags": "new_with_tags",
              "like_new": "like_new",
              "excellent": "excellent",
              "good": "good",
              "fair": "fair",
            };
            
            const mappedCondition = conditionMap[analysis.condition] || "like_new";
            
            setDetectedCard({
              name: analysis.title || "Detected Item",
              set: analysis.brand || analysis.subcategory || "",
              number: "",
              estimatedPrice: analysis.suggested_price || 0,
            });
            
            if (analysis.title) setTitle(analysis.title);
            if (analysis.suggested_price) setPrice(String(analysis.suggested_price));
            if (analysis.brand) setSetName(analysis.brand);
            if (mappedCondition) setCondition(mappedCondition);
            if (analysis.description) setDescription(analysis.description);
          }
        } catch (error) {
          console.error("AI analysis error:", error);
          // Continue to form even if AI fails - user can fill manually
        }
        
        setStep("form");
      } else {
        // Additional images - go straight to form
        setStep("form");
      }
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
    setImageAssets(imageAssets.filter((_, i) => i !== index));
    // Reset to upload if no images left
    if (images.length === 1) {
      setStep("upload");
      setDetectedCard(null);
      setAiAnalysis(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to create a listing");
      return;
    }

    if (!title || !price || !condition) {
      Alert.alert("Missing info", "Please fill in all required fields (Title, Price, Condition)");
      return;
    }

    if (images.length === 0) {
      Alert.alert("Images Required", "Please add at least one image");
      return;
    }

    setStep("submitting");

    try {
      // Create listing record first
      const listingData = {
        seller_id: user.id,
        title,
        description: description || null,
        category: "Trading Cards",
        subcategory: "Pokémon Singles",
        condition,
        seller_price: parseFloat(price),
        currency: "GBP",
        status: "active",
        accepts_offers: acceptOffers,
        free_shipping: freeShipping,
        shipping_cost_uk: freeShipping ? 0 : (parseFloat(shippingCost) || 0),
        ai_agent_visible: aiAgentVisible,
        ai_confidence: aiAnalysis?.confidence || {},
        style_tags: aiAnalysis?.style_tags || [],
      };

      // Add optional fields
      if (setName) listingData.brand = setName;
      if (rarity) listingData.subcategory = rarity;

      const listing = await createListing(listingData);

      // Upload images to storage
      const uploadedUrls = await uploadListingImages(listing.id, images);

      if (uploadedUrls.length === 0) {
        throw new Error("Failed to upload images");
      }

      // Create listing_images records
      await createListingImages(listing.id, uploadedUrls, aiAnalysis);

      Alert.alert("Success!", "Your listing is now live", [
        {
          text: "View Listing",
          onPress: () => {
            router.push(`/listing/${listing.id}`);
            // Reset form
            setStep("upload");
            setImages([]);
            setImageAssets([]);
            setTitle("");
            setPrice("");
            setDescription("");
            setDetectedCard(null);
            setAiAnalysis(null);
            setCondition("like_new");
            setSetName("");
            setRarity("");
          },
        },
        {
          text: "Stay Here",
          style: "cancel",
          onPress: () => {
            setStep("upload");
            setImages([]);
            setImageAssets([]);
            setTitle("");
            setPrice("");
            setDescription("");
            setDetectedCard(null);
            setAiAnalysis(null);
            setCondition("like_new");
            setSetName("");
            setRarity("");
          },
        },
      ]);
    } catch (error) {
      console.error("Error creating listing:", error);
      Alert.alert("Error", error.message || "Failed to create listing");
      setStep("form");
    }
  };

  const UploadScreen = () => (
    <View
      style={{ flex: 1, paddingHorizontal: 24, paddingTop: insets.top + 80 }}
    >
      <View style={{ alignItems: "center", marginBottom: 60 }}>
        <View
          style={{
            width: 100,
            height: 100,
            backgroundColor: colors.lightGray,
            borderRadius: 50,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <Sparkles size={50} color={colors.foreground} strokeWidth={2} />
        </View>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 36,
            color: colors.foreground,
            textAlign: "center",
            marginBottom: 16,
            letterSpacing: -1,
          }}
        >
          List in Seconds
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            color: colors.gray,
            textAlign: "center",
            lineHeight: 24,
          }}
        >
          Take a photo and let AI detect the card,{"\n"}condition, and suggested
          price
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => pickImage(true)}
        style={{
          backgroundColor: colors.foreground,
          paddingVertical: 16,
          borderRadius: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Camera size={22} color={colors.background} strokeWidth={2} />
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 15,
            color: colors.background,
            marginLeft: 10,
          }}
        >
          Take Photo
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => pickImage(false)}
        style={{
          backgroundColor: colors.background,
          borderWidth: 1.5,
          borderColor: colors.foreground,
          paddingVertical: 16,
          borderRadius: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Upload size={22} color={colors.foreground} strokeWidth={2} />
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 15,
            color: colors.foreground,
            marginLeft: 10,
          }}
        >
          Upload from Library
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          marginTop: 20,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: colors.foreground,
            textDecorationLine: "underline",
          }}
        >
          List Multiple Cards
        </Text>
      </TouchableOpacity>
    </View>
  );

  const DetectingScreen = () => (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
      }}
    >
      <ActivityIndicator size="large" color={colors.foreground} />
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 24,
          color: colors.foreground,
          marginTop: 32,
          textAlign: "center",
          letterSpacing: -0.5,
        }}
      >
        AI Detecting Card...
      </Text>
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          color: colors.gray,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        Analyzing image, checking authenticity,{"\n"}and finding market price
      </Text>
    </View>
  );

  const FormScreen = () => (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 80,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {detectedCard && (
          <View
            style={{
              backgroundColor: colors.lightGray,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Check size={22} color={colors.foreground} strokeWidth={2} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                  color: colors.foreground,
                  marginBottom: 4,
                }}
              >
                AI Detected
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: colors.gray,
                }}
              >
                {detectedCard.name} · {detectedCard.set}
              </Text>
            </View>
          </View>
        )}

        {/* Photos Section */}
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 18,
            color: colors.foreground,
            marginBottom: 12,
          }}
        >
          Photos
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 24 }}
        >
          {images.map((uri, index) => (
            <View
              key={index}
              style={{
                width: 100,
                height: 140,
                marginRight: 12,
                borderRadius: 8,
                overflow: "hidden",
                backgroundColor: colors.lightGray,
              }}
            >
              <Image
                source={{ uri }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
              <TouchableOpacity
                onPress={() => removeImage(index)}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  backgroundColor: "rgba(0,0,0,0.7)",
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={14} color={colors.background} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => pickImage(false)}
            style={{
              width: 100,
              height: 140,
              borderRadius: 8,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.lightGray,
            }}
          >
            <Upload size={28} color={colors.gray} strokeWidth={2} />
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 11,
                color: colors.gray,
                marginTop: 6,
              }}
            >
              Add More
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Basics Section */}
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 18,
            color: colors.foreground,
            marginBottom: 16,
          }}
        >
          Basics
        </Text>

        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: colors.foreground,
            marginBottom: 8,
          }}
        >
          Title
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Card title"
          placeholderTextColor={colors.gray}
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 15,
            color: colors.foreground,
            backgroundColor: colors.lightGray,
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 16,
          }}
        />

        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: colors.foreground,
            marginBottom: 8,
          }}
        >
          Category
        </Text>
        <View
          style={{
            backgroundColor: colors.lightGray,
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 15,
              color: colors.foreground,
            }}
          >
            Trading Cards
          </Text>
        </View>

        {/* Card Details Section */}
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 18,
            color: colors.foreground,
            marginBottom: 16,
          }}
        >
          Card Details
        </Text>

        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: colors.foreground,
            marginBottom: 8,
          }}
        >
          Set Name / Code
        </Text>
        <TextInput
          value={setName}
          onChangeText={setSetName}
          placeholder="e.g. Base Set, Champions Path"
          placeholderTextColor={colors.gray}
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 15,
            color: colors.foreground,
            backgroundColor: colors.lightGray,
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 16,
          }}
        />

        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: colors.foreground,
            marginBottom: 8,
          }}
        >
          Rarity
        </Text>
        <View
          style={{
            backgroundColor: colors.lightGray,
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 15,
              color: colors.gray,
            }}
          >
            Select rarity
          </Text>
        </View>

        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: colors.foreground,
            marginBottom: 12,
          }}
        >
          Condition
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginBottom: 16,
            gap: 8,
          }}
        >
          {[
            { label: "Mint", value: "new_with_tags" },
            { label: "Near Mint", value: "like_new" },
            { label: "Excellent", value: "excellent" },
            { label: "Good", value: "good" },
            { label: "Fair", value: "fair" },
          ].map((cond) => (
            <TouchableOpacity
              key={cond.value}
              onPress={() => setCondition(cond.value)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                backgroundColor:
                  condition === cond.value ? colors.foreground : colors.lightGray,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                  color:
                    condition === cond.value ? colors.background : colors.foreground,
                }}
              >
                {cond.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Switch
            value={isGraded}
            onValueChange={setIsGraded}
            trackColor={{ false: colors.border, true: colors.foreground }}
            thumbColor={colors.background}
          />
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 14,
              color: colors.foreground,
              marginLeft: 10,
            }}
          >
            This card is professionally graded
          </Text>
        </View>

        {/* Description */}
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 18,
            color: colors.foreground,
            marginBottom: 12,
          }}
        >
          Description
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Provide details about your card..."
          placeholderTextColor={colors.gray}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 15,
            color: colors.foreground,
            backgroundColor: colors.lightGray,
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 24,
            minHeight: 100,
          }}
        />

        {/* Pricing Section */}
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 18,
            color: colors.foreground,
            marginBottom: 12,
          }}
        >
          Pricing
        </Text>

        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
            color: colors.foreground,
            marginBottom: 8,
          }}
        >
          Selling Price (£)
        </Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="0.00"
          keyboardType="decimal-pad"
          placeholderTextColor={colors.gray}
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 15,
            color: colors.foreground,
            backgroundColor: colors.lightGray,
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 8,
          }}
        />

        <TouchableOpacity style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 13,
              color: colors.foreground,
              textDecorationLine: "underline",
            }}
          >
            Get Price Suggestion
          </Text>
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Switch
            value={acceptOffers}
            onValueChange={setAcceptOffers}
            trackColor={{ false: colors.border, true: colors.foreground }}
            thumbColor={colors.background}
          />
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 14,
              color: colors.foreground,
              marginLeft: 10,
            }}
          >
            Accept Offers?
          </Text>
        </View>

        {/* Shipping Section */}
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 18,
            color: colors.foreground,
            marginBottom: 12,
          }}
        >
          Shipping
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Switch
            value={freeShipping}
            onValueChange={setFreeShipping}
            trackColor={{ false: colors.border, true: colors.foreground }}
            thumbColor={colors.background}
          />
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 14,
              color: colors.foreground,
              marginLeft: 10,
            }}
          >
            I'll pay for shipping (Free for buyer)
          </Text>
        </View>

        {!freeShipping && (
          <>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: colors.foreground,
                marginBottom: 8,
              }}
            >
              UK Shipping Cost (£)
            </Text>
            <TextInput
              value={shippingCost}
              onChangeText={setShippingCost}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.gray}
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 15,
                color: colors.foreground,
                backgroundColor: colors.lightGray,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 14,
                marginBottom: 24,
              }}
            />
          </>
        )}

        {/* AI Agent Visibility */}
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 18,
            color: colors.foreground,
            marginBottom: 12,
          }}
        >
          AI Agent Visibility
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Switch
            value={aiAgentVisible}
            onValueChange={setAiAgentVisible}
            trackColor={{ false: colors.border, true: colors.foreground }}
            thumbColor={colors.background}
          />
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: colors.foreground,
              marginLeft: 10,
            }}
          >
            Sell via AI Answer Engines
          </Text>
        </View>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            color: colors.gray,
            marginBottom: 24,
          }}
        >
          Allow AI agents to discover and purchase this item
        </Text>
      </ScrollView>

      {/* Submit Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          style={{
            backgroundColor: colors.foreground,
            paddingVertical: 16,
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 15,
              color: colors.background,
            }}
          >
            Publish Listing
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingAnimatedView>
  );

  const SubmittingScreen = () => (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
      }}
    >
      <ActivityIndicator size="large" color={colors.foreground} />
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 24,
          color: colors.foreground,
          marginTop: 32,
          textAlign: "center",
          letterSpacing: -0.5,
        }}
      >
        Creating Listing...
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 16,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 32,
            color: colors.foreground,
            letterSpacing: -1,
          }}
        >
          Sell
        </Text>
      </View>

      {step === "upload" && <UploadScreen />}
      {step === "detecting" && <DetectingScreen />}
      {step === "form" && <FormScreen />}
      {step === "submitting" && <SubmittingScreen />}
    </View>
  );
}
